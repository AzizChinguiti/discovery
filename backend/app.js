require("dotenv").config();
const express = require("express");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./Routes/authRoutes");
const explorerRoutes = require("./routes/explorerRoutes"); 
const businessRoutes = require("./routes/businessRoutes");
const postRoutes = require('./Routes/postRoutes');
const db = require("./database/index");
const app = express();
const transporter = require("./resetCode"); 

app.use(express.json());

app.use("/admin", adminRoutes);
app.use("/auth", authRoutes); 
app.use("/explorer", explorerRoutes); 
app.use("/business", businessRoutes);
app.use('/posts', postRoutes);

app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, text } = req.body;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });

    console.log("Email sent successfully");
    res.status(200).send("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

const PORT = process.env.PORT || 3000; 

app.listen(PORT, () => {
  console.log(`Server listening at http://${process.env.DB_HOST}:${PORT}`);
});
