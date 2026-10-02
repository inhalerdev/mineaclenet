type PlayerAvatarProps = {
  uuid: string;
  size?: number;
  className?: string;
  alt?: string;
  eager?: boolean;
};

function avatarSize(value: number) {
  if (!Number.isFinite(value)) {
    return 64;
  }

  return Math.max(8, Math.min(600, Math.round(value)));
}

export function playerAvatarUrl(uuid: string, size = 64) {
  const safeSize = avatarSize(size);
  const identifier = uuid.trim() || "MHF_Steve";

  return `https://mc-heads.net/avatar/${encodeURIComponent(identifier)}/${safeSize}.png`;
}

export function PlayerAvatar({
  uuid,
  size = 64,
  className,
  alt = "",
  eager = false,
}: PlayerAvatarProps) {
  const safeSize = avatarSize(size);

  return (
    <img
      alt={alt}
      className={className}
      decoding="async"
      height={safeSize}
      loading={eager ? "eager" : "lazy"}
      referrerPolicy="no-referrer"
      src={playerAvatarUrl(uuid, safeSize)}
      width={safeSize}
    />
  );
}
