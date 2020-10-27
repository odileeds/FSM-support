# Indices of Mulitple Deprivation

We use the data from Anjali's Google Sheet (the only FSM support sheet which is open) to examine [how well offers are targetting areas of deprivation](summary.csv).

## Method

The [postcodes](../postcodes/) directory contains UK (not yet including Northern Ireland because of licensing issues) postcodes split by area, district, and sector into more manageable CSV files e.g. LS8 9AG is in [postcodes/LS/8/9.csv](../postcodes/LS/8/9.csv). The columns consist of `postcodes`, `latitude`, `longitude`, and `LSOA11CD`. The [imd.csv](imd.csv) file contains the columns `LSOA code (2011)`, `Index of Multiple Deprivation (IMD) Decile (where 1 is most deprived 10% of LSOAs)`, and `Income Deprivation Affecting Children Index (IDACI) Decile (where 1 is most deprived 10% of LSOAs)`. We lookup the LSOA for each postcode in the Google Sheet and find the corresponding IDACI decile. We then total these up by decile. The result is the total number of places offering support by decile, not the total number of meals offered.
