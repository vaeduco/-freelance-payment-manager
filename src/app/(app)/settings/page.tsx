import { redirect } from "next/navigation";

// Settings is now a dropdown of sub-pages; /settings lands on Profile.
export default function SettingsPage() {
  redirect("/settings/profile");
}
