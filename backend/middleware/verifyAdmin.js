import { User } from "../models/user.model.js";

export const verifyAdmin = async (req, res, next) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ success: false, message: "Unauthorized - no user ID" });
        }

        const user = await User.findById(req.userId).select('role');
        
        if (!user) {
            return res.status(401).json({ success: false, message: "User not found" });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Forbidden - Admin access required" });
        }

        next();
    } catch (error) {
        console.log("Error in verifyAdmin middleware:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
