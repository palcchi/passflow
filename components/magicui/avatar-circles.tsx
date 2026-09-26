import { cn } from "@/lib/utils";

export type AvatarCircleItem = {
  name: string;
  imageUrl?: string | null;
};

export function AvatarCircles({
  people,
  extra = 0,
  className,
}: {
  people: AvatarCircleItem[];
  extra?: number;
  className?: string;
}) {
  return (
    <div className={cn("avatar-circles", className)} aria-label="Attendees">
      {people.slice(0, 5).map((person, index) => (
        <span
          className="avatar-circle"
          key={`${person.name}-${index}`}
          title={person.name}
          style={
            person.imageUrl
              ? { backgroundImage: `url("${person.imageUrl}")` }
              : undefined
          }
        >
          {!person.imageUrl && person.name.trim().charAt(0).toUpperCase()}
        </span>
      ))}
      {extra > 0 && <span className="avatar-circle avatar-circle-extra">+{extra}</span>}
    </div>
  );
}
