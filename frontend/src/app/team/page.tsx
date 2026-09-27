import { redirect } from "next/navigation";

/** S1 placeholder route; the manager view now lives at /recruits. */
export default function TeamPage() {
  redirect("/recruits");
}
