const cron = require('node-cron');
const Task = require('../models/taskModel');
const User = require('../models/userModel');
const sendCalendarInvite = require('./emailService');

// This function starts the background clock
const startCronJob = () => {
  // SCHEDULE: Run every day at 9:00 AM ('0 9 * * *')
  // For testing right now, we will use ('* * * * *') which means EVERY MINUTE.
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ CRON JOB: Checking for approaching deadlines...');

    try {
      // 1. Calculate "Tomorrow"
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      // 2. Find tasks due within the next 24 hours that are NOT completed
      const tasksDueSoon = await Task.find({
        deadline: { 
            $gte: today, 
            $lte: tomorrow 
        },
        status: { $ne: 'Completed' } // Only pending tasks
      });

      // 3. Send warnings for each task found
      if (tasksDueSoon.length > 0) {
        console.log(`⚠️ Found ${tasksDueSoon.length} tasks due soon. Sending emails...`);
        
        for (const task of tasksDueSoon) {
            const employee = await User.findById(task.assignedTo);
            
            if (employee && employee.email) {
                // Send "Deadline Warning" Email
                sendCalendarInvite(employee.email, {
                    ...task.toObject(),
                    title: `[DEADLINE WARNING] Due Tomorrow: ${task.title}`,
                    description: `This is a reminder that your task is due in less than 24 hours. Please prioritize.`
                });
                console.log(`   -> Email sent to ${employee.email} for task "${task.title}"`);
            }
        }
      } else {
        console.log('   -> No urgent tasks found.');
      }

    } catch (error) {
      console.error('❌ CRON ERROR:', error);
    }
  });
};

module.exports = startCronJob;