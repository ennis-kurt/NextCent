import { cache } from "react";

import { getPersonas } from "@/lib/api";

export const getPageFramePersonas = cache(async () => getPersonas());
