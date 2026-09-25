import { ConsultationRoom } from "@/components/consultation-room";
import { RealtimeProvider } from "@/lib/realtime";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return (
    <RealtimeProvider>
      <ConsultationRoom appointmentId={roomId} />
    </RealtimeProvider>
  );
}

