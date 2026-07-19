import LiveChatWindow from "@/components/livechat/LiveChatWindow";

export default function ViewerLiveChatPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-xl font-bold text-white">Live Chat</h1>
      {/* change "Random" to whatever name you want your gf to see at the top of the chat */}
      <LiveChatWindow role="viewer" partnerLabel="Random" />
    </div>
  );
}
