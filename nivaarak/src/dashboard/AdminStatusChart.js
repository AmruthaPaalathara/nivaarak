import React, { useEffect, useRef, useState, useMemo } from 'react';
import API from "../utils/api";

const AdminStatusChart = () => {
    const chartRef = useRef(null);
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Retrieve user role from localStorage (or authentication state)
    const userRole = localStorage.getItem("userRole") || "user"; // Default to "user" if not set
    const endpoint = userRole === "admin" ? "/admin-dashboard/status-stats" : "/userCharts/user-applications";

    useEffect(() => {
        const fetchStatusData = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    setError("Authentication token missing.");
                    setLoading(false);
                    return;
                }

                setLoading(true);
                const res = await API.get(endpoint, { headers: { Authorization: `Bearer ${token}` } });
                setLoading(false);

                const { Pending, Approved, Rejected } = res.data;
                setChartData([Pending, Approved, Rejected]);
            } catch (err) {
                console.error("Error fetching status data:", err);
                setError("Failed to fetch chart data. Please try again.");
                setLoading(false);
            }
        };

        fetchStatusData();
    }, [endpoint]);

    // Customize title dynamically based on user role
    const chartTitle = userRole === "admin" ? "Admin Application Status Distribution" : "Your Application Status Overview";

    const chartConfig = useMemo(() => ({
        chart: { type: 'column' },
        title: { text: chartTitle },
        xAxis: { categories: ['Pending', 'Approved', 'Rejected'], title: { text: 'Status' } },
        yAxis: { min: 0, title: { text: 'Number of Applications' } },
        series: [{ name: 'Applications', data: chartData || [0, 0, 0] }],
        colors: ['#f0ad4e', '#5cb85c', '#d9534f'],
        credits: { enabled: false }
    }), [chartData, chartTitle]);

    useEffect(() => {
        if (typeof window.Highcharts === "undefined") {
            console.error("Highcharts not loaded.");
            return;
        }

        if (window.Highcharts && chartRef.current && chartData) {
            window.Highcharts.chart(chartRef.current, chartConfig);
        }
    }, [chartData, chartConfig]);

    if (loading) {
        return <p>Loading chart data...</p>;
    }

    if (error) {
        return <p style={{ color: "red" }}>{error}</p>;
    }

    return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
};

export default AdminStatusChart;