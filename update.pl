#!/usr/bin/perl

use Text::CSV;
use Data::Dumper;

$url = "https://docs.google.com/spreadsheets/d/106f8g5TUtBm7cB7RSXJQCC7eaLM_4Xf4RCliaStyuGw/gviz/tq?tqx=out:csv&sheet=details";
$file = "data/data.csv";
$file2 = "data/all-of-us-together.csv";
$imdfile = "imd/imd.csv";

# Get directory
$dir = $0;
if($dir =~ /\//){ $dir =~ s/^(.*)\/([^\/]*)/$1/g; }
else{ $dir = "./"; }


if(time() - (stat $dir.$file)[9] >= 600){ 
	`wget -q --no-check-certificate -O "$dir$file" "$url"`;
}

my $csv = Text::CSV->new ({
	binary    => 1,
	auto_diag => 1,
	sep_char  => ','    # not really needed as this is the default
});

open(my $data, '<:encoding(utf8)', $dir.$imdfile) or die "Could not open '$dir$file' $!\n";
$head = -1;
$i = 0;
%lsoa;
while (my $fields = $csv->getline( $data )) {
	@f = @{$fields};
	$n = @f;
	if($fields->[0] eq "LSOA code (2011)" && $head < 0){
		$head = $i;
		for($c = 0; $c < @f; $c++){
			if($f[$c]){
				$header{$f[$c]} = $c;
			}
		}
	}
	if($head >= 0 && $i > $head){
		$lsoa{$f[$header{'LSOA code (2011)'}]} = $f[$header{'Income Deprivation Affecting Children Index (IDACI) Decile (where 1 is most deprived 10% of LSOAs)'}];
	}
	$i++;
}
if (not $csv->eof) {
  $csv->error_diag();
}
close(FILE);



######################
# Open Anjali's sheet
%postcodes;
%header;
$head = -1;
$i = 0;
open(my $data, '<:encoding(utf8)', $dir.$file) or die "Could not open '$dir$file' $!\n";
while (my $fields = $csv->getline( $data )) {

	@f = @{$fields};
	$n = @f;
	if($fields->[0] eq "Name" && $head < 0){
		$head = $i;
		for($c = 0; $c < @f; $c++){
			if($f[$c]){
				$header{$f[$c]} = $c;
			}
		}
	}
	if($head >= 0 && $i > $head){
		$postcodes{$f[$header{'Postcode'}]} = 1;
	}
	$i++;
}
if (not $csv->eof) {
  $csv->error_diag();
}
close $data;

##########################
# Open All Of Us Together
%header;
$head = -1;
$i = 0;
open(my $data, '<:encoding(utf8)', $dir.$file2) or die "Could not open '$dir$file2' $!\n";
while (my $fields = $csv->getline( $data )) {

	@f = @{$fields};
	$n = @f;
	if($fields->[0] eq "Name" && $head < 0){
		$head = $i;
		for($c = 0; $c < @f; $c++){
			if($f[$c]){
				$header{$f[$c]} = $c;
			}
		}
	}
	if($head >= 0 && $i > $head){
		$postcodes{$f[$header{'Postcode'}]} = 1;
	}
	$i++;
}
if (not $csv->eof) {
  $csv->error_diag();
}
close $data;



%imd;
$added = 0;
$json = "{\n";
foreach $pcd (sort(keys(%postcodes))){
	
	if($pcd =~ /^([^\s]+) ([0-9A-Z])/){
		$ocd = $1;
		$icd = $2;
		$ocd =~ /^([A-Z]{1,2})([0-9]+|[0-9][A-Z])$/;
		$area = $1;
		$district = $2;
		$path = $area."/".$district."/".$icd;
		
		$pfile = $dir."postcodes/$path.csv";
		if(-e $pfile){
			open(my $data, '<:encoding(utf8)', $pfile) or die "Could not open '$pfile' $!\n";
			while (my $fields = $csv->getline( $data )) {
				if($fields->[0] eq $pcd){
					$decile = sprintf("%2d",$lsoa{$fields->[3]});
					if($lsoa{$fields->[3]} < 1){
						if(!$imd{'?'}){ $imd{'?'} = 0; }
						$imd{'?'}++;
					}else{
						if(!$imd{$decile}){ $imd{$decile} = 0; }
						$imd{$decile}++;
					}
					$json .= ($added > 0 ? ",\n" : "")."\t\"$pcd\":[$fields->[2],$fields->[1]]";
					$added++;
				}
			}
			close $data;
		}else{
			if(!$imd{'?'}){ $imd{'?'} = 0; }
			$imd{'?'}++;
		}
	}
}
$json .= "}\n";

open(FILE,">",$dir."imd/summary.csv");
print FILE "Income Deprivation Affecting Children Index (IDACI) Decile (where 1 is most deprived 10% of LSOAs),Number of offers of support\n";
foreach $key (sort(keys(%imd))){
	$k = $key;
	$k =~ s/^ //g;
	print FILE "$k,$imd{$key}\n";
}
close(FILE);

open(FILE,">",$dir."postcodes.json");
print FILE $json;
close(FILE);
