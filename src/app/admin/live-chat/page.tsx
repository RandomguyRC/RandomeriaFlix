import LiveChatWindow from "@/components/livechat/LiveChatWindow";

export default function AdminLiveChatPage() {
  return (
    <div className="mx-auto h-full max-w-2xl">
      <LiveChatWindow role="admin" partnerLabel="Cherry" />
    </div>
  );
}
