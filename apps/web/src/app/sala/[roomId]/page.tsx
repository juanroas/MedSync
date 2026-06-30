import { ConsultationRoom } from "@/components/consultation-room";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <ConsultationRoom appointmentId={roomId} />;
}

