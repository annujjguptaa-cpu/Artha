import Foundation
import WebKit
import Observation
import BackgroundTasks

@Observable
class CartExecutionEngine: NSObject, WKScriptMessageHandler {
    var progressMessage: String = ""
    var isExecuting: Bool = false
    var isCompleted: Bool = false
    var failedItems: [String] = []
    var loginRequiredFor: [String] = [] // Platforms requiring login
    
    private var webViews: [String: WKWebView] = [:]
    private let stateManager = CartExecutionStateManager()
    private var continuationMapping: [String: CheckedContinuation<Bool, Never>] = [:]
    
    override init() {
        super.init()
        setupWebViews()
        registerBackgroundTasks()
    }
    
    private func setupWebViews() {
        let platforms = ["zepto", "blinkit", "instamart"]
        for platform in platforms {
            let config = WKWebViewConfiguration()
            let store = WKWebsiteDataStore(forIdentifier: UUID(uuidString: "com.groceryapp.\(platform)") ?? UUID())
            config.websiteDataStore = store
            
            // Register message handler for DOM events
            let userContentController = WKUserContentController()
            userContentController.add(self, name: "cartBridge")
            config.userContentController = userContentController
            
            let webView = WKWebView(frame: .zero, configuration: config)
            webViews[platform] = webView
        }
    }
    
    private func registerBackgroundTasks() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: "com.groceryapp.cartexecution", using: nil) { task in
            self.handleBackgroundTask(task: task as! BGProcessingTask)
        }
    }
    
    private func handleBackgroundTask(task: BGProcessingTask) {
        task.expirationHandler = {
            self.isExecuting = false
        }
        // Logic to resume execution if we had a pending list
        task.setTaskCompleted(success: true)
    }
    
    func checkLogins() async {
        loginRequiredFor = []
        // In a real app, this would check if cookies exist for the domains
        // For now, we simulate that login is always required for demo if no cookies
        for (platform, webView) in webViews {
            let records = await webView.configuration.websiteDataStore.httpCookieStore.getAllCookies()
            if records.isEmpty {
                loginRequiredFor.append(platform)
            }
        }
    }
    
    func getWebView(for platform: String) -> WKWebView? {
        return webViews[platform]
    }
    
    func startExecution(listId: String, items: [WinnerItem]) async {
        isExecuting = true
        isCompleted = false
        failedItems = []
        let total = items.count
        var current = 0
        
        for item in items {
            guard isExecuting else { break }
            current += 1
            
            if stateManager.isItemCompleted(itemID: item.item_id, listID: listId) {
                continue
            }
            
            progressMessage = "Adding \(current)/\(total) to \(item.platform.capitalized)..."
            let success = await executeAddToCart(item: item)
            
            if success {
                stateManager.markItemCompleted(itemID: item.item_id, listID: listId)
            } else {
                failedItems.append(item.item_id)
            }
            
            // Random delay 800ms - 2200ms
            let delay = Double.random(in: 0.8...2.2)
            try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
        }
        
        progressMessage = "Cart building complete!"
        try? await Task.sleep(nanoseconds: 1_000_000_000)
        isExecuting = false
        isCompleted = true
    }
    
    private func executeAddToCart(item: WinnerItem) async -> Bool {
        guard let config = PlatformSelectors.config(for: item.platform),
              let webView = webViews[item.platform.lowercased()] else { return false }
        
        return await withCheckedContinuation { continuation in
            DispatchQueue.main.async {
                let urlString = String(format: config.searchUrlTemplate, item.name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")
                if let url = URL(string: urlString) {
                    self.continuationMapping[item.item_id] = continuation
                    
                    let js = """
                        // MutationObserver to wait for DOM
                        let observer = new MutationObserver((mutations, obs) => {
                            let btn = document.querySelector("\(config.addBtnSelector)");
                            if (btn) {
                                btn.click();
                                obs.disconnect();
                                window.webkit.messageHandlers.cartBridge.postMessage({status: "success", itemId: "\(item.item_id)"});
                            }
                        });
                        observer.observe(document.body, {childList: true, subtree: true});
                        
                        // Fail-safe timeout
                        setTimeout(() => {
                            observer.disconnect();
                            window.webkit.messageHandlers.cartBridge.postMessage({status: "timeout", itemId: "\(item.item_id)"});
                        }, 15000);
                    """
                    
                    webView.load(URLRequest(url: url))
                    
                    // We simulate the injection for the test
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                        webView.evaluateJavaScript(js) { _, error in
                            if let error = error {
                                print("JS Error: \\(error)")
                                self.resolveContinuation(itemId: item.item_id, success: false)
                            }
                        }
                    }
                } else {
                    continuation.resume(returning: false)
                }
            }
        }
    }
    
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "cartBridge", let dict = message.body as? [String: String] {
            let itemId = dict["itemId"] ?? ""
            let status = dict["status"] ?? ""
            resolveContinuation(itemId: itemId, success: status == "success")
        }
    }
    
    private func resolveContinuation(itemId: String, success: Bool) {
        if let cont = continuationMapping.removeValue(forKey: itemId) {
            cont.resume(returning: success)
        }
    }
}
