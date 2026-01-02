'use client';
import Layout from '@/app/components/Layout/Layout';

export default function AdminLayout({ children }) {
  return <Layout role="admin">{children}</Layout>;
}