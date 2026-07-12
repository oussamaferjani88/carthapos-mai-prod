import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { lazy, Suspense } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import DashboardLayout from "./components/DashboardLayout";
import { AccessModeProvider } from "@/contexts/AccessModeContext";
import PageSkeleton from "./components/skeletons/PageSkeleton";
import BlogSkeleton from "./components/skeletons/BlogSkeleton";
import DocsSkeleton from "./components/skeletons/DocsSkeleton";
import ContactSkeleton from "./components/skeletons/ContactSkeleton";

// Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const Features = lazy(() => import("./pages/Features"));
const Docs = lazy(() => import("./pages/Docs"));
const Blog = lazy(() => import("./pages/Blog"));
const Contact = lazy(() => import("./pages/Contact"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const VerificationPending = lazy(() => import("./pages/VerificationPending"));
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const Generator = lazy(() => import("./pages/dashboard/Generator"));
const BiExportDeploy = lazy(() => import("./pages/dashboard/BiExportDeploy"));
const BIDashboardViewer = lazy(() => import("./pages/dashboard/BIDashboardViewer"));
const POSGeneratorPage = lazy(() => import("./pages/pos/POSGeneratorPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            {/* Public Routes with Navbar and Footer */}
            <Route path="/" element={
              <>
                <Navbar />
                <Index />
                <Footer />
              </>
            } />
            <Route path="/features" element={
              <>
                <Navbar />
                <Suspense fallback={<PageSkeleton />}>
                  <Features />
                </Suspense>
                <Footer />
              </>
            } />
            <Route path="/docs" element={
              <>
                <Navbar />
                <Suspense fallback={<DocsSkeleton />}>
                  <Docs />
                </Suspense>
                <Footer />
              </>
            } />
            <Route path="/blog" element={
              <>
                <Navbar />
                <Suspense fallback={<BlogSkeleton />}>
                  <Blog />
                </Suspense>
                <Footer />
              </>
            } />
            <Route path="/contact" element={
              <>
                <Navbar />
                <Suspense fallback={<ContactSkeleton />}>
                  <Contact />
                </Suspense>
                <Footer />
              </>
            } />
            <Route path="/login" element={
              <Suspense fallback={<PageSkeleton />}>
                <Login />
              </Suspense>
            } />
            <Route path="/register" element={
              <Suspense fallback={<PageSkeleton />}>
                <Register />
              </Suspense>
            } />
            <Route path="/verification-pending" element={
              <Suspense fallback={<PageSkeleton />}>
                <VerificationPending />
              </Suspense>
            } />

            {/* Dashboard Routes (no Navbar/Footer, has DashboardLayout) */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={
                <Suspense fallback={<PageSkeleton />}>
                  <Dashboard />
                </Suspense>
              } />
              <Route path="generator" element={
                <Suspense fallback={<PageSkeleton />}>
                  <Generator />
                </Suspense>
              } />
              <Route path="bi-export" element={
                <Suspense fallback={<PageSkeleton />}>
                  <BiExportDeploy />
                </Suspense>
              } />
              <Route path="bi-dashboard" element={
                <Suspense fallback={<PageSkeleton />}>
                  <BIDashboardViewer />
                </Suspense>
              } />
              <Route path="bi-dashboard/:dashboardId" element={
                <Suspense fallback={<PageSkeleton />}>
                  <BIDashboardViewer />
                </Suspense>
              } />
            </Route>

            {/* POS Generator Route (with DashboardLayout sidebar) */}
            <Route path="/pos-generator" element={
              <DashboardLayout />
            }>
              <Route index element={
                <AccessModeProvider>
                  <Suspense fallback={<PageSkeleton />}>
                    <POSGeneratorPage />
                  </Suspense>
                </AccessModeProvider>
              } />
            </Route>

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
