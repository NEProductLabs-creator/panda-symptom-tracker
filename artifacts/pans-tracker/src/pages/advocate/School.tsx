import { useEffect } from "react";
import { track } from "@/lib/analytics";
import SchoolHub from "@/pages/SchoolHub";

export default function AdvocateSchool() {
  useEffect(() => {
    track("advocate_section_viewed", { section: "school" });
  }, []);

  return <SchoolHub />;
}
