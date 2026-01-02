import { Box, Typography } from '@mui/material';
import { CalendarMonth as CalendarIcon } from '@mui/icons-material';

// Update the formatPackage function to show the most up-to-date remaining classes
export const formatPackage = (student, theme, translations) => {
  // Check if student has an active package
  const hasPackages = student.packages && student.packages.length > 0;
  const hasActivePackage = hasPackages && student.packages.some(pkg => pkg.status === 'active');
  
  // Get the active package or first package
  const activePackage = hasPackages
    ? student.packages.find(pkg => pkg.status === 'active') || student.packages[0]
    : null;
  
  // Check if all student classes exist and are used
  const hasClasses = student.classes && student.classes.length > 0;
  
  // If student has packages but none are active, check if any packages have scheduled classes
  if (hasPackages && !hasActivePackage && hasClasses) {
    const scheduledClasses = student.classes.filter(c => c.status === 'scheduled');
    
    if (scheduledClasses.length > 0) {
      // Find packages with scheduled classes
      const packagesWithScheduledClasses = new Set(scheduledClasses.map(c => c.studentPackageId));
      
      // If student has allPackages data (from ViewDialog), use that to get the package info
      if (student.allPackages) {
        for (const packageId of packagesWithScheduledClasses) {
          const packageWithScheduledClasses = student.allPackages.find(p => p.id === packageId);
          
          if (packageWithScheduledClasses) {
            // Count the scheduled classes for this package
            const packageScheduledClasses = scheduledClasses.filter(c => c.studentPackageId === packageId);
            const scheduledClassesCount = packageScheduledClasses.length;
            
            console.log('DEBUG - Table formatPackage (inactive) - Scheduled classes count:', {
              studentId: student.id,
              packageId,
              scheduledClassesCount,
              storedRemainingClasses: packageWithScheduledClasses.remainingClasses
            });
            
            // Override the active package for display purposes
            return (
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: theme?.text?.primary || 'black' }}>
                  {packageWithScheduledClasses.package?.name || 'Unknown Package'} (*)
                </Typography>
                <Typography variant="caption" sx={{ color: theme?.text?.secondary || 'gray' }}>
                  {translations.remaining || 'Remaining'}: {scheduledClassesCount}
                </Typography>
              </Box>
            );
          }
        }
      }
    }
  }
  
  // No active package or no packages at all
  if (!activePackage) {
    return (
      <Typography variant="body2" sx={{ color: theme?.text?.secondary || 'gray' }}>
        {translations.noPackage || 'No Package'}
      </Typography>
    );
  }
  
  // For display purposes
  const displayRemainingClasses = (() => {
    // If we have access to student.classes, count the scheduled classes directly
    if (student.classes) {
      const scheduledClassesCount = student.classes.filter(
        cls => cls.studentPackageId === activePackage.id && cls.status === 'scheduled'
      ).length;
      
      console.log('DEBUG - Table formatPackage - Scheduled classes count:', {
        studentId: student.id,
        packageId: activePackage.id,
        scheduledClassesCount,
        storedRemainingClasses: activePackage.remainingClasses
      });
      
      return scheduledClassesCount;
    }
    
    // Fallback to the stored value if classes aren't available
    return activePackage.remainingClasses !== undefined ? activePackage.remainingClasses : 0;
  })();
  
  // Check if the student has scheduled classes with this package ID
  const hasScheduledClasses = 
    // Either we have explicit class objects that are scheduled
    (student.classes && student.classes.some(
      cls => cls.studentPackageId === activePackage.id && cls.status === 'scheduled'
    )) || 
    // Or we have an active package with remainingClasses that's less than the total (meaning some are scheduled)
    (hasActivePackage && 
    activePackage.package && 
    activePackage.package.totalClasses && 
    displayRemainingClasses < activePackage.package.totalClasses);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Typography variant="body2" sx={{ fontWeight: 500, color: theme?.text?.primary || 'black' }}>
        {activePackage.package?.name || 'Unknown Package'}
      </Typography>
      <Typography variant="caption" sx={{ color: theme?.text?.secondary || 'gray' }}>
        {translations.remaining || 'Remaining'}: {displayRemainingClasses}
      </Typography>
    </Box>
  );
}; 