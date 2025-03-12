import EnhancedTextarea from "./enhanced-textarea";

export function InitChat() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F8F8F8] p-6">
      <div className="w-full max-w-xl">
        <div className="space-y-6">
          <div className="space-y-1">
            <p className="text-lg text-gray-500">Welcome back!</p>
            <h2 className="text-2xl font-medium text-gray-800">
              How can we help you find products?
            </h2>
          </div>

          <EnhancedTextarea />
        </div>
      </div>
    </main>
  );
}
