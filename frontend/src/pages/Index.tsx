import { useNavigate } from "react-router-dom"
import { Bell, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

const Index = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h1 className="text-2xl font-bold">
          Welcome back, Sunrise Realtors 👋
        </h1>

        <div className="flex items-center gap-3">
          
          {/* 🔔 Notifications */}
          <Button variant="ghost" size="icon">
            <Bell className="w-5 h-5" />
          </Button>

          {/* ➕ New Campaign */}
          <Button
            onClick={() => navigate("/campaigns/new")}
            className="bg-tenant-accent hover:bg-tenant-accent/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Card 1 */}
        <div className="bg-card rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">Credits Balance</p>
          <h2 className="text-3xl font-bold mt-2">15,420</h2>
        </div>

        {/* Card 2 */}
        <div className="bg-card rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">New Leads</p>
          <h2 className="text-3xl font-bold mt-2">5</h2>
        </div>

        {/* Card 3 */}
        <div className="bg-card rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">Appointments</p>
          <h2 className="text-3xl font-bold mt-2">2</h2>
        </div>

      </div>
    </div>
  )
}

export default Index
