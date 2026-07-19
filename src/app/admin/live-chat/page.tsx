import LiveChatWindow from "@/components/livechat/LiveChatWindow";

export default function AdminLiveChatPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold text-white">Live Chat</h1>
      <LiveChatWindow role="admin" partnerLabel="Your girlfriend" />
    </div>
  );
}
