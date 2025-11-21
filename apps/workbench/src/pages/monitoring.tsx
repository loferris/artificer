import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { MonitoringDashboard } from '../components/MonitoringDashboard';

const MonitoringPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Model Monitoring Dashboard - AI Workflow Engine</title>
        <meta name="description" content="Monitor AI model usage, health, and performance" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <MonitoringDashboard />
      </main>
    </>
  );
};

export default MonitoringPage;