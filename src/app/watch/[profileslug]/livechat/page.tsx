import LiveChatWindow from "@/components/livechat/LiveChatWindow";

export default function ViewerLiveChatPage() {
  return (
    <div className="mx-auto max-w-2xl px-3 py-4 sm:px-4 sm:py-6">
      {/* change "Random" to whatever name you want your gf to see at the top of the chat */}
      <LiveChatWindow role="viewer" partnerLabel="Random" />
    </div>
  );
}
