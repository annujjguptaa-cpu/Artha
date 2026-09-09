import SwiftUI

struct ExecutionSummaryView: View {
    let result: OptimizationResult
    @Environment(NetworkManager.self) var network
    @State private var openAppError: Bool = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                VStack(spacing: 16) {
                    ZStack {
                        Circle()
                            .fill(Color.mint.opacity(0.2))
                            .frame(width: 100, height: 100)
                        Image(systemName: "checkmark.seal.fill")
                            .resizable()
                            .frame(width: 60, height: 60)
                            .foregroundColor(.mint)
                    }
                    .padding(.top, 40)
                    
                    Text("Carts Built Successfully")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.nearBlack)
                    
                    Text("Your items are waiting for checkout in the native apps.")
                        .multilineTextAlignment(.center)
                        .foregroundColor(.secondary)
                        .padding(.horizontal, 30)
                }
                
                let grouped = Dictionary(grouping: result.winners, by: { $0.platform })
                
                VStack(spacing: 16) {
                    ForEach(grouped.keys.sorted(), id: \.self) { platform in
                        let count = grouped[platform]?.count ?? 0
                        HStack(spacing: 16) {
                            PlatformBadge(platform: platform)
                                .scaleEffect(1.2)
                            
                            VStack(alignment: .leading, spacing: 4) {
                                HStack(spacing: 6) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.green)
                                        .font(.subheadline)
                                    Text("\(count) items added")
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                        .foregroundColor(.nearBlack)
                                }
                            }
                            Spacer()
                            Button(action: {
                                openPlatformApp(platform: platform)
                            }) {
                                Text("Open App")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 8)
                                    .background(Color.seafoam)
                                    .foregroundColor(.white)
                                    .cornerRadius(20)
                            }
                        }
                        .padding()
                        .cardStyle()
                    }
                }
                .padding(.horizontal)
                
                Button(action: {
                    network.optimizationResult = nil // Return to start
                }) {
                    Text("Start New List")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.deepTeal)
                        .foregroundColor(.white)
                        .cornerRadius(16)
                        .shadow(color: Color.deepTeal.opacity(0.3), radius: 8, x: 0, y: 4)
                }
                .padding(.horizontal)
                .padding(.bottom, 40)
            }
        }
        .background(Color(UIColor.systemGroupedBackground).edgesIgnoringSafeArea(.all))
        .navigationBarHidden(true)
        .alert("App Not Installed", isPresented: $openAppError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("We couldn't open the native app. Please ensure it is installed.")
        }
    }
    
    private func openPlatformApp(platform: String) {
        let scheme: String
        switch platform.lowercased() {
        case "zepto": scheme = "zepto://"
        case "blinkit": scheme = "blinkit://"
        case "instamart": scheme = "swiggy://"
        default: scheme = ""
        }
        
        if let url = URL(string: scheme), UIApplication.shared.canOpenURL(url) {
            UIApplication.shared.open(url)
        } else {
            openAppError = true
        }
    }
}
