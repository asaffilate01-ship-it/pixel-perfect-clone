import { BarChart3, Flag, Hand, Shield, Trophy, Users } from "lucide-react";
import { criterionIcon, type CriterionIcon } from "@/lib/fanzeno";

const glyphs = {
  trophy: Trophy,
  flag: Flag,
  people: Users,
  stats: BarChart3,
  hand: Hand,
  shield: Shield,
} as const;

/** Meaningful glyph for a criterion label (or a pre-resolved icon key). */
export function CriterionGlyph({
  label,
  icon,
  className = "size-3.5 shrink-0 text-primary",
}: {
  label?: string | undefined;
  icon?: CriterionIcon | undefined;
  className?: string | undefined;
}) {
  const Icon = glyphs[icon ?? criterionIcon(label ?? "")];
  return <Icon className={className} aria-hidden />;
}
