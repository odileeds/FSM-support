#!/usr/bin/perl

use Text::CSV;
use Data::Dumper;

$url = "https://docs.google.com/spreadsheets/d/106f8g5TUtBm7cB7RSXJQCC7eaLM_4Xf4RCliaStyuGw/gviz/tq?tqx=out:csv&sheet=details";
$file = "data.csv";

if(time() - (stat $file)[9] >= 600){ 
	`wget -q --no-check-certificate -O "$file" "$url"`;
}

my $csv = Text::CSV->new ({
	binary    => 1,
	auto_diag => 1,
	sep_char  => ','    # not really needed as this is the default
});

%postcodes;
%header;
$head = -1;
open(my $data, '<:encoding(utf8)', $file) or die "Could not open '$file' $!\n";
while (my $fields = $csv->getline( $data )) {
	@f = @{$fields};
	$n = @f;
	if($fields->[0] eq "Name" && $head < 0){
		$head = $i;
		for($c = 0; $c < @f; $c++){
			if($f[$c]){
				print "$f[$c]\n";
				$header{$f[$c]} = $c;
			}
		}
		print Dumper %header;
	}
	if($head > 0 && $i > $head){
		$postcodes{$f[$header{'Postcode'}]} = 1;
	}
	$i++;
}
if (not $csv->eof) {
  $csv->error_diag();
}
close $data;

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
		
		$pfile = "postcodes/$path.csv";
		open(my $data, '<:encoding(utf8)', $pfile) or die "Could not open '$file' $!\n";
		while (my $fields = $csv->getline( $data )) {
			if($fields->[0] eq $pcd){
				$json .= ($added > 0 ? ",\n" : "")."\t\"$pcd\":[$fields->[2],$fields->[1]]";
				$added++;
			}
		}
		close $data;
	}
}
$json .= "}\n";

open(FILE,">","postcodes.json");
print FILE $json;
close(FILE);