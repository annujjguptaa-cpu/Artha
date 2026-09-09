import Foundation
import Observation

enum NetworkError: Error {
    case invalidURL
    case serverError(String)
    case offline
}

@Observable
class NetworkManager {
    var isChecking: Bool = false
    var progressMessage: String = ""
    var error: NetworkError? = nil
    var optimizationResult: OptimizationResult? = nil
    
    private var webSocketTask: URLSessionWebSocketTask?
    private let baseURL = "http://127.0.0.1:8000"
    private let wsURL = "ws://127.0.0.1:8000"
    
    func comparePrices(rawText: String) async {
        self.isChecking = true
        self.error = nil
        self.optimizationResult = nil
        self.progressMessage = "Parsing list..."
        
        do {
            // 1. Parse List
            guard let parseUrl = URL(string: "\(baseURL)/parse-list") else { throw NetworkError.invalidURL }
            var parseReq = URLRequest(url: parseUrl)
            parseReq.httpMethod = "POST"
            parseReq.setValue("application/json", forHTTPHeaderField: "Content-Type")
            let reqBody = ParseListRequest(raw_text: rawText)
            parseReq.httpBody = try JSONEncoder().encode(reqBody)
            
            let (parseData, parseResp) = try await URLSession.shared.data(for: parseReq)
            guard let httpParse = parseResp as? HTTPURLResponse, httpParse.statusCode == 200 else {
                throw NetworkError.serverError("Failed to parse list")
            }
            
            let parsedList = try JSONDecoder().decode(ShoppingListResponse.self, from: parseData)
            let listId = parsedList.list_id
            
            // 2. Connect WebSocket for live progress
            connectWebSocket(listId: listId)
            self.progressMessage = "Starting comparison..."
            
            // 3. Request Comparison
            guard let compareUrl = URL(string: "\(baseURL)/compare/\(listId)") else { throw NetworkError.invalidURL }
            var compareReq = URLRequest(url: compareUrl)
            compareReq.httpMethod = "POST"
            
            let (compareData, compareResp) = try await URLSession.shared.data(for: compareReq)
            guard let httpCompare = compareResp as? HTTPURLResponse, httpCompare.statusCode == 200 else {
                throw NetworkError.serverError("Failed to compare items")
            }
            
            let result = try JSONDecoder().decode(OptimizationResult.self, from: compareData)
            
            // Success
            DispatchQueue.main.async {
                self.optimizationResult = result
                self.isChecking = false
                self.webSocketTask?.cancel(with: .normalClosure, reason: nil)
            }
            
        } catch {
            DispatchQueue.main.async {
                self.error = .offline
                self.isChecking = false
                self.webSocketTask?.cancel(with: .normalClosure, reason: nil)
            }
        }
    }
    
    private func connectWebSocket(listId: String) {
        guard let url = URL(string: "\(wsURL)/ws/compare/\(listId)") else { return }
        webSocketTask = URLSession.shared.webSocketTask(with: url)
        webSocketTask?.resume()
        receiveWebSocketMessage()
    }
    
    private func receiveWebSocketMessage() {
        webSocketTask?.receive { [weak self] result in
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    if let data = text.data(using: .utf8),
                       let progress = try? JSONDecoder().decode(ProgressUpdate.self, from: data) {
                        DispatchQueue.main.async {
                            self?.progressMessage = "Checking \(progress.completed_items)/\(progress.total_items) items..."
                        }
                    }
                default: break
                }
                self?.receiveWebSocketMessage() // loop
            case .failure:
                break // usually normal closure when task completes
            }
        }
    }
}
