import Foundation

struct CartExecutionState: Codable {
    var completedItemIDs: Set<String> = []
    var listID: String = ""
}

class CartExecutionStateManager {
    private let fileURL: URL
    
    init() {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        fileURL = docs.appendingPathComponent("CartExecutionState.json")
    }
    
    func saveState(_ state: CartExecutionState) {
        do {
            let data = try JSONEncoder().encode(state)
            try data.write(to: fileURL, options: .atomic)
        } catch {
            print("Failed to save state: \(error)")
        }
    }
    
    func loadState() -> CartExecutionState {
        guard let data = try? Data(contentsOf: fileURL),
              let state = try? JSONDecoder().decode(CartExecutionState.self, from: data) else {
            return CartExecutionState()
        }
        return state
    }
    
    func markItemCompleted(itemID: String, listID: String) {
        var state = loadState()
        if state.listID != listID {
            // New list overrides old state
            state.listID = listID
            state.completedItemIDs = []
        }
        state.completedItemIDs.insert(itemID)
        saveState(state)
    }
    
    func isItemCompleted(itemID: String, listID: String) -> Bool {
        let state = loadState()
        return state.listID == listID && state.completedItemIDs.contains(itemID)
    }
}
