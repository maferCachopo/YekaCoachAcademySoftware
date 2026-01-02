'use client';

import React from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import moment from 'moment';

const PackageInfo = ({ 
  packageInfo, 
  loadingPackage, 
  translations, 
  packageEndDate, 
  getFormattedPackageEndDate 
}) => {
  // Format the package name for display
  const getPackageName = () => {
    if (packageInfo?.package?.name) {
      return packageInfo.package.name;
    }
    return 'your package';
  };

  // Get remaining classes with proper fallback
  const getRemainingClasses = () => {
    if (packageInfo?.remainingClasses !== undefined) {
      return packageInfo.remainingClasses;
    }
    return 'some';
  };

  return (
    <Alert 
      severity="info"
      icon={<InfoIcon />}
      sx={{ mb: 3 }}
    >
      {loadingPackage ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={16} thickness={5} sx={{ color: '#845EC2' }} />
          <Typography variant="body2">{translations.loadingPackageInfo || "Loading package information..."}</Typography>
        </Box>
      ) : !packageInfo ? (
        <Typography variant="body2">
          {translations.noPackageInfo || "Unable to load package information. Please try again later."}
        </Typography>
      ) : !packageEndDate || !packageEndDate.isValid() ? (
        <Typography variant="body2">
          {translations.invalidPackageDate || "Unable to determine package end date. Please contact support."}
        </Typography>
      ) : (
        <Typography variant="body2">
          {translations.packageDetailsSummary?.replace('${remainingClasses}', getRemainingClasses())
            .replace('${packageName}', getPackageName())
            .replace('${date}', getFormattedPackageEndDate()) || 
          `You have ${getRemainingClasses()} classes remaining in ${getPackageName()} that expires on ${getFormattedPackageEndDate()}. You can only reschedule classes within this period.`}
        </Typography>
      )}
    </Alert>
  );
};

export default PackageInfo;