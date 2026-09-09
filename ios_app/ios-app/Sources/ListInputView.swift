import SwiftUI

struct ListInputView: View {
    @Environment(NetworkManager.self) var network
    @State private var rawText: String = ""
    @FocusState private var isFocused: Bool
    
    var body: some View {
        ZStack {
            Color(UIColor.systemBackground).edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 24) {
                if network.isChecking {
                    loadingView
                } else if network.error != nil {
                    errorView
                } else {
                    inputView
                }
            }
            .animation(.easeInOut(duration: 0.3), value: network.isChecking)
            .animation(.easeInOut(duration: 0.3), value: network.error != nil)
        }
    }
    
    private var inputView: some View {
        VStack(spacing: 20) {
            ZStack(alignment: .topLeading) {
                TextEditor(text: $rawText)
                    .focused($isFocused)
                    .padding()
                    .background(Color(UIColor.secondarySystemBackground))
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(isFocused ? Color.deepTeal : Color.clear, lineWidth: 2)
                    )
                
                if rawText.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "list.bullet.clipboard")
                            Text("Paste your grocery list here...")
                        }
                        .font(.headline)
                        
                        Text("e.g.\n2kg tomatoes\nAmul butter 500g\n1L milk")
                            .font(.subheadline)
                    }
                    .foregroundColor(Color(UIColor.tertiaryLabel))
                    .padding(.horizontal, 20)
                    .padding(.vertical, 24)
                    .allowsHitTesting(false)
                }
            }
            .padding(.horizontal)
            
            Button(action: {
                isFocused = false
                Task {
                    await network.comparePrices(rawText: rawText)
                }
            }) {
                Text("Compare Prices")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(rawText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? Color.gray.opacity(0.3) : Color.deepTeal)
                    .foregroundColor(rawText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? .gray : .white)
                    .cornerRadius(16)
                    .scaleEffect(isFocused ? 0.98 : 1.0)
                    .animation(.spring(), value: isFocused)
            }
            .disabled(rawText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            .padding(.horizontal)
            .padding(.bottom, 10)
        }
    }
    
    private var loadingView: some View {
        VStack(spacing: 32) {
            ZStack {
                Circle()
                    .stroke(Color.seafoam.opacity(0.2), lineWidth: 8)
                    .frame(width: 100, height: 100)
                
                Circle()
                    .trim(from: 0, to: 0.7)
                    .stroke(Color.mint, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .frame(width: 100, height: 100)
                    .rotationEffect(Angle(degrees: 360))
                    .animation(Animation.linear(duration: 1).repeatForever(autoreverses: false), value: network.isChecking)
                
                Image(systemName: "cart.fill")
                    .font(.largeTitle)
                    .foregroundColor(.deepTeal)
            }
            
            VStack(spacing: 8) {
                Text(network.progressMessage)
                    .font(.headline)
                    .foregroundColor(.nearBlack)
                Text("Optimizing your cart...")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var errorView: some View {
        VStack(spacing: 20) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 60))
                .foregroundColor(Color.orange)
            
            Text("Connection Failed")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.nearBlack)
            
            Text("We couldn't reach the optimization engine. Please check your connection and try again.")
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
                .padding(.horizontal, 30)
            
            Button(action: {
                Task { await network.comparePrices(rawText: rawText) }
            }) {
                Text("Try Again")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.deepTeal)
                    .foregroundColor(.white)
                    .cornerRadius(16)
            }
            .padding(.horizontal, 40)
            .padding(.top, 10)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
