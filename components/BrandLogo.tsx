import Image from "next/image";
import simsanLogo from "@/public/simsan_fraser_logo.png";

export function BrandLogo({ className = "", priority = false, sizes = "220px" }: { className?: string; priority?: boolean; sizes?: string }) {
  return (
    <Image
      src={simsanLogo}
      alt="Simsan Fraser Maintenance Ltd."
      className={["brand-logo", className].filter(Boolean).join(" ")}
      priority={priority}
      sizes={sizes}
    />
  );
}
