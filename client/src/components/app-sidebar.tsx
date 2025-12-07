import { LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/translations";

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  const menuItems = [
    {
      title: t("dashboard"),
      url: "/",
      key: "dashboard"
    },
    {
      title: t("weather"),
      url: "/weather",
      key: "weather"
    },
    {
      title: t("predictions"),
      url: "/predictions",
      key: "predictions"
    },
    {
      title: t("my_lands"),
      url: "/lands",
      key: "my_lands"
    },
    {
      title: t("ai_assistant"),
      url: "/chat",
      key: "ai_assistant"
    },
    {
      title: t("profile"),
      url: "/profile",
      key: "profile"
    },
  ];

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  };

  return (
    <Sidebar>
            <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          
          <div>
            <h2 className="text-lg font-bold text-sidebar-foreground">Agri-Forecast</h2>
            <p className="text-xs text-muted-foreground">AI Farm Assistant</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2 px-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    className="h-auto py-3 px-4 hover:bg-transparent group transition-all duration-300"
                  >
                    <Link href={item.url} data-testid={`link-${item.key}`} className="relative overflow-hidden rounded-xl">
                      {/* Background Hover Effect */}
                      <div className={`
                        absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500
                        bg-gradient-to-r from-primary/10 via-primary/5 to-transparent
                        ${location === item.url ? 'opacity-100 from-primary/15' : ''}
                      `} />
                      
                      {/* Active Indicator Line */}
                      <div className={`
                        absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-primary
                        transition-all duration-300 origin-left
                        ${location === item.url ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-50'}
                      `} />

                      {/* Text Content */}
                      <span className={`
                        relative z-10 text-base font-medium tracking-wide transition-all duration-300 pl-4
                        ${location === item.url 
                          ? "text-primary font-bold translate-x-1" 
                          : "text-muted-foreground group-hover:text-foreground group-hover:translate-x-2"
                        }
                      `}>
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate" data-testid="text-username">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => window.location.href = '/api/logout'}
        >
          <LogOut className="w-4 h-4" />
          {t("logout")}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
