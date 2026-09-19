import SwiftUI

struct ComparisonResultView: View {
    let result: OptimizationResult
    @Environment(NetworkManager.self) var network
    @State private var engine = CartExecutionEngine()
    @State private var isAnimating: Bool = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Hero Card
                VStack(spacing: 16) {
                    Text("Optimization Complete")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(Color.seafoam)
                        .textCase(.uppercase)
                    
                    HStack(alignment: .top, spacing: 2) {
                        Text("₹")
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(.nearBlack)
                            .padding(.top, 4)
                        
                        AnimatingNumberView(value: result.total_cost)
                            .foregroundColor(.nearBlack)
                    }
                    
                    if result.split_cart_used {
                        HStack {
                            Image(systemName: "arrow.down.right.circle.fill")
                            Text("Saved ₹\(String(format: "%.2f", result.savings)) vs single platform")
                                .fontWeight(.medium)
                        }
                        .font(.footnote)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.mint.opacity(0.15))
                        .foregroundColor(Color.deepTeal)
                        .cornerRadius(20)
                    } else {
                        Text("Single Platform Strategy")
                            .font(.footnote)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.gray.opacity(0.1))
                            .foregroundColor(.secondary)
                            .cornerRadius(20)
                    }
                }
                .padding(.vertical, 24)
                .padding(.horizontal, 16)
                .frame(maxWidth: .infinity)
                .cardStyle()
                .padding(.horizontal)
                .opacity(isAnimating ? 1 : 0)
                .offset(y: isAnimating ? 0 : 20)
                
                // Grouped Items
                let grouped = Dictionary(grouping: result.winners, by: { $0.platform })
                
                ForEach(Array(grouped.keys.sorted().enumerated()), id: \.element) { index, platform in
                    VStack(spacing: 0) {
                        HStack {
                            PlatformBadge(platform: platform)
                            Spacer()
                            if let sub = result.platform_totals[platform] {
                                Text("₹\(String(format: "%.2f", sub))")
                                    .fontWeight(.bold)
                                    .foregroundColor(.nearBlack)
                            }
                        }
                        .padding()
                        .background(Color(UIColor.tertiarySystemBackground))
                        
                        Divider()
                        
                        VStack(spacing: 0) {
                            ForEach(grouped[platform] ?? []) { item in
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(item.name)
                                            .font(.body)
                                            .foregroundColor(.nearBlack)
                                        if let rating = item.rating {
                                            HStack(spacing: 4) {
                                                Image(systemName: "star.fill")
                                                    .foregroundColor(.yellow)
                                                    .font(.caption2)
                                                Text(String(format: "%.1f", rating))
                                                    .font(.caption)
                                                    .foregroundColor(.secondary)
                                            }
                                        }
                                    }
                                    Spacer()
                                    Text("₹\(String(format: "%.2f", item.price))")
                                        .fontWeight(.semibold)
                                }
                                .padding()
                                
                                if item.item_id != grouped[platform]?.last?.item_id {
                                    Divider().padding(.leading)
                                }
                            }
                        }
                    }
                    .cardStyle()
                    .padding(.horizontal)
                    .opacity(isAnimating ? 1 : 0)
                    .offset(y: isAnimating ? 0 : 20)
                    .animation(.spring(duration: 0.4).delay(Double(index) * 0.1 + 0.1), value: isAnimating)
                }
                
                // Needs Review
                if !result.needs_review.isEmpty {
                    VStack(spacing: 0) {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.orange)
                            Text("Needs Review")
                                .font(.headline)
                                .foregroundColor(.orange)
                            Spacer()
                        }
                        .padding()
                        .background(Color.orange.opacity(0.1))
                        
                        Divider()
                        
                        VStack(spacing: 0) {
                            ForEach(result.needs_review) { item in
                                HStack {
                                    Text(item.requested_item.name)
                                        .font(.body)
                                    Spacer()
                                    Text("No Matches")
                                        .font(.caption)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(Color.orange.opacity(0.2))
                                        .foregroundColor(.orange)
                                        .cornerRadius(6)
                                }
                                .padding()
                                
                                if item.item_id != result.needs_review.last?.item_id {
                                    Divider().padding(.leading)
                                }
                            }
                        }
                    }
                    .background(Color(UIColor.secondarySystemBackground))
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.orange.opacity(0.5), lineWidth: 1)
                    )
                    .padding(.horizontal)
                    .opacity(isAnimating ? 1 : 0)
                    .offset(y: isAnimating ? 0 : 20)
                    .animation(.spring(duration: 0.4).delay(0.4), value: isAnimating)
                }
                
                // Build Carts Button
                VStack {
                    if engine.isExecuting {
                        VStack(spacing: 12) {
                            ProgressView()
                                .tint(Color.deepTeal)
                            Text(engine.progressMessage)
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(Color.deepTeal)
                        }
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.seafoam.opacity(0.1))
                        .cornerRadius(16)
                    } else if engine.isCompleted {
                        NavigationLink(destination: ExecutionSummaryView(result: result).environment(network)) {
                            Text("View Summary")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.mint)
                                .foregroundColor(.nearBlack)
                                .cornerRadius(16)
                        }
                    } else {
                        Button(action: {
                            Task {
                                await engine.startExecution(listId: "current_list", items: result.winners)
                            }
                        }) {
                            Text("Build My Carts")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.deepTeal)
                                .foregroundColor(.white)
                                .cornerRadius(16)
                                .shadow(color: Color.deepTeal.opacity(0.3), radius: 8, x: 0, y: 4)
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.top, 8)
                .padding(.bottom, 24)
                .opacity(isAnimating ? 1 : 0)
                .animation(.easeInOut.delay(0.5), value: isAnimating)
            }
            .padding(.top, 16)
        }
        .navigationTitle("Your Optimized Carts")
        .navigationBarTitleDisplayMode(.inline)
        .background(Color(UIColor.systemGroupedBackground).edgesIgnoringSafeArea(.all))
        .onAppear {
            isAnimating = true
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Back") {
                    network.optimizationResult = nil
                }
                .foregroundColor(Color.deepTeal)
            }
        }
        .task {
            await engine.checkLogins()
        }
        .sheet(isPresented: Binding(
            get: { !engine.loginRequiredFor.isEmpty && !engine.isExecuting },
            set: { _ in }
        )) {
            VStack(spacing: 20) {
                Image(systemName: "person.crop.circle.badge.exclamationmark")
                    .font(.system(size: 60))
                    .foregroundColor(.orange)
                Text("Login Required")
                    .font(.title2)
                    .fontWeight(.bold)
                Text("Please log in to: \(engine.loginRequiredFor.joined(separator: ", "))")
                    .foregroundColor(.secondary)
                Button("Done") {
                    engine.loginRequiredFor = []
                }
                .buttonStyle(.borderedProminent)
                .tint(Color.deepTeal)
            }
            .padding()
        }
    }
}

