import type { Metadata } from "next";
import { JoinSpace } from "@/components/JoinSpace";

export const metadata: Metadata = { title: "Join a space | NEXUS OS" };

export default function JoinSpacePage() {
  return <JoinSpace />;
}
