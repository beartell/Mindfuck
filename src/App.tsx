import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import ChatPanel from "@/components/layout/ChatPanel";
import SettingsPanel from "@/components/layout/SettingsPanel";
import GraphCanvas from "@/components/graph/GraphCanvas";
import AddNodeButton from "@/components/graph/AddNodeButton";
import ActionBar from "@/components/graph/ActionBar";
import TimelineBar from "@/components/graph/TimelineBar";
import NodeModal from "@/components/node-editor/NodeModal";

function App() {
  return (
    <div className="w-full h-full flex overflow-hidden bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        <div className="flex-1 relative overflow-hidden">
          <GraphCanvas />
          <ActionBar />
          <TimelineBar />
          <AddNodeButton />
          <NodeModal />
        </div>
      </div>

      <ChatPanel />
      <SettingsPanel />
    </div>
  );
}

export default App;
