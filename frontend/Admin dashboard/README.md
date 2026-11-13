# RideSync AI — Admin Dashboard Module

This folder contains the complete Admin Dashboard pages and components for RideSync AI Belagavi:

## Components & Pages

1. **`AdminDashboard.jsx`**
   - Core administrative operations center.
   - Primary KPI Cards: **Total Rides Today** (Completed, In Progress, Cancelled) & **Active Drivers** (Available vs. En Route).
   - Removed Fleet Utilization and Total Revenue per specification.
   - Full-width interactive **Belagavi Accident Risk & Safety Zones Map** with horizontal title layout.
   - Real-time **Active Fleet Telemetry** grid displaying driver status, vehicle type, license plate, and zone coordinates.

2. **`AdminApplications.jsx`**
   - Driver onboarding queue with status filtering (**Processing**, **Approved**, **Rejected**).
   - Action controls for instant one-click approval or rejection.
   - Cancelled Rides Registry with ride ID, timestamp, cancellation reason, and sector.

3. **`AccidentRiskMap.jsx`**
   - Belagavi urban accident risk heatmap correlating historical accidents with traffic bottleneck sectors.
   - 🔴 **Red Zones**: CBT Junction & Khade Bazar (42 accidents), Sambra Highway Merge (38 accidents).
   - 🟡 **Yellow Zones**: Tilakwadi 3rd Gate (16 accidents), Udyambag Industrial Ring (13 accidents).
   - 🟢 **Green Zones**: Military Cantonment (2 accidents), VTU Boulevard (1 accident).
   - Core analytical conclusion: **71% of all urban accidents are concentrated in Red zones**.
