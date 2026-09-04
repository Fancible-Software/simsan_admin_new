import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "nodemailer", "exceljs", "pdf-lib"],
  turbopack: { root: process.cwd() },
  async redirects() {
    return [
      { source: "/api/quote/:id/:uuid", destination: "/quote/:id/:uuid", permanent: true },
      { source: "/api/invoice/:id/:uuid", destination: "/invoice/:id/:uuid", permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: "/user/details", destination: "/api/auth/me" },
      { source: "/admin/users/:skip/:limit", destination: "/api/users?skip=:skip&limit=:limit" },
      { source: "/admin/create/user", destination: "/api/users" },
      { source: "/admin/verify/user", destination: "/api/auth/verify" },
      { source: "/admin/resend/otp/:type", destination: "/api/auth/resend?type=:type" },
      { source: "/admin/role", destination: "/api/legacy/role" },
      { source: "/admin/delete/:id", destination: "/api/users/:id" },
      { source: "/admin/update/status/:id/:status", destination: "/api/legacy/users/:id/status/:status" },
      { source: "/services/service/:id", destination: "/api/services/:id" },
      { source: "/services/all/:skip/:limit", destination: "/api/services?skip=:skip&limit=:limit" },
      { source: "/services/update/:id", destination: "/api/services/:id" },
      { source: "/services/create", destination: "/api/services" },
      { source: "/services/all-services", destination: "/api/legacy/services/active" },
      { source: "/services/:id", destination: "/api/services/:id" },
      { source: "/form/all/:skip/:limit", destination: "/api/legacy/forms/:skip/:limit" },
      { source: "/form/analytics", destination: "/api/legacy/analytics" },
      { source: "/form/create", destination: "/api/forms" },
      { source: "/form/update/:id", destination: "/api/forms/:id" },
      { source: "/form/generate/invoice", destination: "/api/forms/generate-invoice" },
      { source: "/form/:id", destination: "/api/forms/:id" },
      { source: "/location/cities", destination: "/api/locations/cities" },
      { source: "/location/provinces", destination: "/api/locations/provinces" },
      { source: "/configuration/all/:skip/:limit", destination: "/api/legacy/configurations/:skip/:limit" },
      { source: "/configuration/create", destination: "/api/configurations" },
      { source: "/configuration/upload/image", destination: "/api/configurations/upload" },
      { source: "/configuration/update", destination: "/api/configurations/legacy-update" },
      { source: "/configuration/:id", destination: "/api/configurations/:id" },
      { source: "/dashboard/count", destination: "/api/dashboard" },
      { source: "/dashboard/graph", destination: "/api/dashboard/graph" },
      { source: "/email/view/:campaign", destination: "/api/email/:campaign" },
      { source: "/email/:campaign", destination: "/api/email/:campaign" },
      { source: "/contact/create", destination: "/api/contact" },
    ];
  },
};

export default nextConfig;
