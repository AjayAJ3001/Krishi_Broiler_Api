require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const { connectDB } = require("./config/db");
const driverRoutes = require("./routes/driverRoute");
const adminRoutes = require("./routes/adminRoute");
const materialRoutes = require("./routes/materialRoute");
const supplierRoutes = require("./routes/supplierRoute");
const poRoutes = require("./routes/poRoute");
const shippingRoutes = require("./routes/shippingRoute");
const sourceLocationRoutes = require("./routes/sourceMasterRoute");
const dcRoutes = require("./routes/dcRoute");
const unitRoutes = require("./routes/unitRoute")
const roleRoutes = require("./routes/roleRoute");
const reportRoutes = require("./routes/reportRoutes");

const broilerRoutes = require("./routes/Broiler/broilerRoutes");
const breederRoutes = require("./routes/Breeder/breederRoutes");

const app = express();
app.use(express.json());
app.use(cors());
app.set('view cache', false);

connectDB();

const PORT = process.env.PORT || 4011;


app.get("/", (req, res) => {
  res.send("Hello from krishi...");
});

app.use("/api/driver", driverRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/material", materialRoutes)
app.use("/api/supplier", supplierRoutes)
app.use("/api/po", poRoutes)
app.use("/api/shipping", shippingRoutes)
app.use("/api/source", sourceLocationRoutes)
app.use("/api/dc", dcRoutes)
app.use("/api/unit", unitRoutes)
app.use("/api/roles", roleRoutes)
app.use("/api/reports", reportRoutes)



app.use('/challans', express.static(path.join(process.cwd(), 'challans'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    }
  },
}));

app.use("/uploads", express.static("uploads"));



// Broiler API
app.use("/api/broiler", broilerRoutes);

//Breeder APIs
app.use("/api/breeder", breederRoutes);


app.listen(PORT, () => {
  console.log("Server starts at ", process.env.SERVER_URL);
})