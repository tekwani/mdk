/**
 * Runnable example for the ContainerDetail feature.
 */
import { useState } from "react"

import { ContainerDetail, ContainerDetailPlaceholder } from "@tetherto/mdk-react-devkit"

const TABS = [
  { key: "home", label: "Home" },
  { key: "pdu", label: "PDU Layout" },
  { key: "settings", label: "Settings" },
  { key: "charts", label: "Charts" },
  { key: "heatmap", label: "Heatmap" },
]

export const ContainerDetailExample = () => {
  const [activeTab, setActiveTab] = useState("home")
  const label = TABS.find((tab) => tab.key === activeTab)?.label ?? activeTab

  return (
    <ContainerDetail
      name="Container 2a"
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onBack={() => {}}
      backLabel="Explorer"
    >
      <ContainerDetailPlaceholder label={label} />
    </ContainerDetail>
  )
}
