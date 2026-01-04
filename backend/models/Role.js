const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Role name cannot exceed 50 characters']
  },
  permissions: [{
    type: String,
    required: true
  }]
}, {
  timestamps: true
});

// Indexes
roleSchema.index({ name: 1 });

// Static method to create default roles
roleSchema.statics.createDefaultRoles = async function() {
  const roles = [
    {
      name: 'admin',
      permissions: ['admin', 'user:read', 'user:write', 'user:delete', 'group:read', 'group:write', 'group:delete', 'expense:read', 'expense:write', 'expense:delete']
    },
    {
      name: 'user',
      permissions: ['user:read', 'group:read', 'group:write', 'expense:read', 'expense:write']
    }
  ];

  for (const roleData of roles) {
    await this.findOneAndUpdate(
      { name: roleData.name },
      roleData,
      { upsert: true, new: true }
    );
  }
};

module.exports = mongoose.model('Role', roleSchema);