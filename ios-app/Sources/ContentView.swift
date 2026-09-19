import SwiftUI

struct ContentView: View {
    @State private var network = NetworkManager()
    
    var body: some View {
        NavigationStack {
            if let result = network.optimizationResult {
                ComparisonResultView(result: result)
                    .environment(network)
            } else {
                ListInputView()
                    .environment(network)
                    .navigationTitle("Grocery Optimizer")
            }
        }
    }
}

#Preview {
    ContentView()
}
