import SwiftUI

extension Color {
    static let deepTeal = Color(red: 2/255, green: 128/255, blue: 144/255)
    static let seafoam = Color(red: 0/255, green: 168/255, blue: 150/255)
    static let mint = Color(red: 2/255, green: 195/255, blue: 154/255)
    static let nearBlack = Color(red: 27/255, green: 43/255, blue: 52/255)
    static let offWhite = Color(red: 244/255, green: 249/255, blue: 248/255)
}

struct CardModifier: ViewModifier {
    @Environment(\.colorScheme) var colorScheme
    
    func body(content: Content) -> some View {
        content
            .background(colorScheme == .dark ? Color(UIColor.secondarySystemBackground) : Color.offWhite)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(colorScheme == .dark ? 0.3 : 0.05), radius: 8, x: 0, y: 4)
    }
}

extension View {
    func cardStyle() -> some View {
        self.modifier(CardModifier())
    }
}

struct PlatformBadge: View {
    let platform: String
    
    var tintColor: Color {
        switch platform.lowercased() {
        case "zepto": return Color.purple
        case "blinkit": return Color.yellow
        case "instamart": return Color.orange
        default: return Color.gray
        }
    }
    
    var body: some View {
        Text(platform.uppercased())
            .font(.caption2)
            .fontWeight(.bold)
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(tintColor.opacity(0.2))
            .foregroundColor(tintColor)
            .cornerRadius(4)
    }
}

struct AnimatingNumberView: View {
    let value: Double
    @State private var animatedValue: Double = 0
    
    var body: some View {
        Text(String(format: "%.2f", animatedValue))
            .font(.system(size: 48, weight: .bold, design: .serif))
            .onAppear {
                withAnimation(.easeOut(duration: 0.8)) {
                    animatedValue = value
                }
            }
    }
}
