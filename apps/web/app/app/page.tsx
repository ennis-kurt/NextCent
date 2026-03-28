import { redirect } from "next/navigation";

export default function AppIndexPage() {
  redirect("/app/dashboard?persona=high-debt-strong-income");
}
