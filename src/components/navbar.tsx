import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/hooks/use-currency";
import { removeToken } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import {
  ShoppingBag, LayoutDashboard, LogOut, Settings,
  Menu, X, Package, Shield, ChevronDown, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { currencies, selectedCurrency, setCurrency } = useCurrency();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    removeToken();
    queryClient.clear();
    navigate("/login");
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 glass border-b border-purple-500/20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/">
              <motion.div
                className="flex items-center gap-2 cursor-pointer"
                whileHover={{ scale: 1.02 }}
              >
                <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center neon-glow-sm">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-lg gradient-text tracking-tight">AI SHOP HUB</span>
              </motion.div>
            </Link>

            {/* Center links */}
            <div className="hidden md:flex items-center gap-6">
              <NavLink href="/">Главная</NavLink>
              <NavLink href="/products">Продукты</NavLink>
              {isAuthenticated && <NavLink href="/dashboard">Кабинет</NavLink>}
              {isAdmin && <NavLink href="/admin">Админ</NavLink>}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Currency selector */}
              {currencies.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1 hidden sm:flex">
                      {selectedCurrency?.symbol} {selectedCurrency?.code}
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="glass border-purple-500/20">
                    {currencies.map((c) => (
                      <DropdownMenuItem
                        key={c.code}
                        onClick={() => setCurrency(c.code)}
                        className={selectedCurrency?.code === c.code ? "text-purple-400" : ""}
                      >
                        {c.symbol} {c.code} — {c.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 glass hover:border-purple-500/40">
                      <div className="w-6 h-6 rounded-full gradient-bg flex items-center justify-center text-xs font-bold text-white">
                        {user?.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="hidden sm:block text-sm">{user?.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="glass border-purple-500/20 w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="w-4 h-4" /> Кабинет
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/orders" className="flex items-center gap-2 cursor-pointer">
                        <Package className="w-4 h-4" /> Заказы
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                        <Settings className="w-4 h-4" /> Настройки
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="flex items-center gap-2 cursor-pointer text-purple-400">
                            <Shield className="w-4 h-4" /> Администратор
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-400 cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" /> Выйти
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden md:flex gap-2">
                  <Link href="/login">
                    <Button variant="ghost" size="sm">Войти</Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" className="gradient-bg neon-glow-sm hover:opacity-90">
                      Регистрация
                    </Button>
                  </Link>
                </div>
              )}

              {/* Mobile menu toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden glass border-t border-purple-500/20"
            >
              <div className="px-4 py-4 space-y-2">
                <MobileNavLink href="/" onClick={() => setMobileOpen(false)}>Главная</MobileNavLink>
                <MobileNavLink href="/products" onClick={() => setMobileOpen(false)}>Продукты</MobileNavLink>
                {isAuthenticated && (
                  <>
                    <MobileNavLink href="/dashboard" onClick={() => setMobileOpen(false)}>Кабинет</MobileNavLink>
                    <MobileNavLink href="/orders" onClick={() => setMobileOpen(false)}>Заказы</MobileNavLink>
                    <MobileNavLink href="/settings" onClick={() => setMobileOpen(false)}>Настройки</MobileNavLink>
                  </>
                )}
                {isAdmin && (
                  <MobileNavLink href="/admin" onClick={() => setMobileOpen(false)}>Администратор</MobileNavLink>
                )}
                {!isAuthenticated && (
                  <div className="flex gap-2 pt-2">
                    <Link href="/login" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setMobileOpen(false)}>
                        Войти
                      </Button>
                    </Link>
                    <Link href="/register" className="flex-1">
                      <Button size="sm" className="w-full gradient-bg" onClick={() => setMobileOpen(false)}>
                        Регистрация
                      </Button>
                    </Link>
                  </div>
                )}
                {isAuthenticated && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-red-400 hover:text-red-400 justify-start"
                    onClick={() => { setMobileOpen(false); handleLogout(); }}
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Выйти
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass border-t border-purple-500/20">
        <div className="flex items-center justify-around h-14 px-2">
          <BottomNavLink href="/" icon={<Zap className="w-5 h-5" />} label="Главная" />
          <BottomNavLink href="/products" icon={<ShoppingBag className="w-5 h-5" />} label="Магазин" />
          {isAuthenticated && (
            <BottomNavLink href="/dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label="Кабинет" />
          )}
          {isAuthenticated && (
            <BottomNavLink href="/orders" icon={<Package className="w-5 h-5" />} label="Заказы" />
          )}
          {!isAuthenticated && (
            <BottomNavLink href="/login" icon={<LogOut className="w-5 h-5" />} label="Войти" />
          )}
        </div>
      </div>
    </>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [location] = useLocation();
  const isActive = location === href;
  return (
    <Link href={href}>
      <span className={`text-sm font-medium transition-colors hover:text-purple-400 cursor-pointer ${isActive ? "text-purple-400" : "text-muted-foreground"}`}>
        {children}
      </span>
    </Link>
  );
}

function MobileNavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link href={href}>
      <div onClick={onClick} className="block py-2 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-purple-500/10 transition-colors cursor-pointer">
        {children}
      </div>
    </Link>
  );
}

function BottomNavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const [location] = useLocation();
  const isActive = location === href || (href !== "/" && location.startsWith(href));
  return (
    <Link href={href}>
      <div className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${isActive ? "text-purple-400" : "text-muted-foreground"}`}>
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
      </div>
    </Link>
  );
}
