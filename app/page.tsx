import { LexArmorControlCenter } from "@/app/_components/lexarmor-control-center";
import { readConfiguredEnv } from "@/lib/env";

export default function Home() {
  // La chat di follow-up viene mostrata solo se OPENAI_API_KEY è davvero configurata.
  // Se la key è un placeholder o manca, la sezione chat è nascosta — così il sito
  // resta pulito anche prima di aver completato l'onboarding OpenAI.
  const chatEnabled = Boolean(readConfiguredEnv("OPENAI_API_KEY"));
  return <LexArmorControlCenter chatEnabled={chatEnabled} />;
}
