interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 40, className = "" }: LogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/icon-master.svg"
      alt="LAMANNE"
      width={size}
      height={size}
      className={`rounded-xl ${className}`}
    />
  );
}
