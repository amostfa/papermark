export enum PlanEnum {
  Pro = "Pro",
  Business = "Business",
  DataRooms = "Data Rooms",
  DataRoomsPlus = "Data Rooms Plus",
  DataRoomsPremium = "Data Rooms Premium",
  DataRoomsUnlimited = "Data Rooms Unlimited",
}

export const PLAN_NAME_MAP: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: PlanEnum.Pro,
  business: PlanEnum.Business,
  datarooms: PlanEnum.DataRooms,
  "datarooms-plus": PlanEnum.DataRoomsPlus,
  "datarooms-premium": PlanEnum.DataRoomsPremium,
  "datarooms-unlimited": PlanEnum.DataRoomsUnlimited,
};

export type PeriodType = "monthly" | "yearly";

export interface Feature {
  id: string;
  text: string;
  highlight?: boolean;
  tooltip?: string;
  isCustomDomain?: boolean;
  isUsers?: boolean;
  usersIncluded?: number;
  isHighlighted?: boolean;
  isNotIncluded?: boolean;
  aliasIds?: string[];
}

export interface PlanFeatures {
  featureIntro: string;
  features: Feature[];
}

type FeatureOptions = {
  period?: PeriodType;
  currency?: string;
  showHighlighted?: boolean;
  maxFeatures?: number;
  excludeFeatures?: string[];
  includeFeatures?: string[];
  highlightFeatures?: string[];
  showDataRoomsPlus?: boolean;
};

export function getPlanFeatures(
  _plan: PlanEnum,
  options: FeatureOptions = {},
): PlanFeatures {
  let features: Feature[] = [];

  if (options.includeFeatures?.length) {
    features = options.includeFeatures.map((id) => ({
      id,
      text: "Unavailable in the self-hosted compatibility build",
      isNotIncluded: true,
      isHighlighted: options.highlightFeatures?.includes(id),
    }));
  }

  if (options.maxFeatures) {
    features = features.slice(0, options.maxFeatures);
  }

  return {
    featureIntro: "Enterprise billing is disabled in this deployment.",
    features,
  };
}
