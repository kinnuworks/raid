import { redirect } from "next/navigation";

/** Short recruit links: /r/abc1234 → /join?ref=abc1234 */
export default async function RecruitLink(props: PageProps<"/r/[code]">) {
  const { code } = await props.params;
  redirect(`/join?ref=${encodeURIComponent(code)}`);
}
