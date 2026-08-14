import { UserRound } from "lucide-react";
import { requireSession } from "@/lib/session";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogoutButton } from "./logout-button";

export default async function AccountPage() {
  const { user } = await requireSession();

  return (
    <>
      <h1 className="font-heading text-2xl font-bold">アカウント</h1>

      <div className="flex items-center gap-4 rounded-lg border border-primary/10 bg-card p-5">
        {/* 名前が隣に出るので画像は装飾（alt=""）。Google の画像が落ちたら人物アイコンに退く。 */}
        <Avatar className="size-15">
          <AvatarImage src={user.image ?? undefined} alt="" />
          <AvatarFallback>
            <UserRound className="size-8" />
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate font-heading text-xl font-bold">{user.name}</p>
          <p className="truncate text-base text-muted-foreground">
            {user.email}
          </p>
        </div>
      </div>

      <LogoutButton />

      <p className="text-center text-xs text-muted-foreground">
        MyCellar · v1.0 (MVP)
      </p>
    </>
  );
}
