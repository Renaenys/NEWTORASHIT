  "use client";

  import { useSession } from "next-auth/react";
  import { useRouter } from "next/navigation";
  import { useEffect, useState } from "react";

  export default function withMembershipGuard(WrappedComponent) {
    return function MembershipProtected(props) {
      const { data: session, status } = useSession();
      const router = useRouter();
      const [profile, setProfile] = useState(null);
      const [checking, setChecking] = useState(true);

      useEffect(() => {
        if (status === "unauthenticated") {
          router.replace("/pages/login");
        }
      }, [status]);

      useEffect(() => {
        const checkProfile = async () => {
          if (status !== "authenticated") return;

          try {
            const res = await fetch("/api/profile");
            const data = await res.json();

            const isNone = data.memberStatus === "none";
            const isTrialExpired =
              data.memberStatus === "trial" &&
              data.memberExpire &&
              new Date(data.memberExpire) < new Date();

            if (isNone || isTrialExpired) {
              router.replace("/pages/pricing");
            } else {
              setProfile(data);
              setChecking(false);
            }
          } catch (err) {
            console.error("❌ Failed to load profile", err);
            router.replace("/pages/login");
          }
        };

        checkProfile();
      }, [status]);

      if (status === "loading" || checking) return null;

      return <WrappedComponent {...props} session={session} profile={profile} />;
    };
  }
