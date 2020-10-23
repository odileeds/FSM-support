#!/usr/bin/perl
# Split postcodes up into manageable bits

use Data::Dumper;

@categories = @ARGV;
if(!@categories){ @categories = ("lat","long"); }
$odir = "postcodes/";
$file = "NSPL/Data/NSPL_AUG_2020_UK.csv";

if(!-e $file){
	print "The National Statistics Postcode Lookup doesn't seem to exist. Please download a copy from:\n";
	print "https://geoportal.statistics.gov.uk/datasets/national-statistics-postcode-lookup-august-2020\n";
	print "And save it as $file\n";
	exit;
}

open(FILE,$file);
#pcd,pcd2,pcds,dointr,doterm,usertype,oseast1m,osnrth1m,osgrdind,oa11,cty,ced,laua,ward,hlthau,nhser,ctry,rgn,pcon,eer,teclec,ttwa,pct,nuts,park,lsoa11,msoa11,wz11,ccg,bua11,buasd11,ru11ind,oac11,lat,long,lep1,lep2,pfa,imd,calncv,stp
#"AB1 0AA","AB1  0AA","AB1 0AA","198001","199606","0","385386","0801193","1","S00090303","S99999999","S99999999","S12000033","S13002843","S08000020","S99999999","S92000003","S99999999","S14000002","S15000001","S09000001","S22000047","S03000012","S31000935","S99999999","S01006514","S02001237","S34002990","S03000012","S99999999","S99999999","3","1C3",57.101474,-2.242851,"S99999999","S99999999","S23000009",6808,"S99999999","S99999999"

$pcd = -1;
@cat;
for($c = 0; $c < @categories; $c++){ $cat[$c] = -1; }

open(FILE,$file);
$counter = 0;
%pcs;

# Regex for postcodes ([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})

$old = "";

while(my $line = <FILE>){

	(@cols) = split(/,/,$line);
	
	if(!$header){
		$header = $line;
		%headerlookup;
		for($i = 0; $i < @cols; $i++){
			$headerlookup{$cols[$i]} = $i;
		}
	}else{
	
		$pcd = clean($cols[$headerlookup{'pcds'}]);
		if($pcd =~ /^([^\s]+) ([0-9A-Z])/){
			$ocd = $1;
			$icd = $2;
			$ocd =~ /^([A-Z]{1,2})([0-9]+|[0-9][A-Z])$/;
			$area = $1;
			$district = $2;

			$str = $pcd;
			$path = $area."/".$district."/".$icd;

			for($c = 0; $c < @categories; $c++){
				$v = $cols[$headerlookup{$categories[$c]}];
				if($categories[$c] eq "lat" || $categories[$c] eq "long"){
					$v = sprintf("%0.5f",$v);
					# Remove trailing zeros
					$v =~ s/0+$//g;
				}
				$str .= ",$v";
			}
			if(!$pcs{$path}){ $pcs{$path} = ""; }
			$pcs{$path} .= ($pcs{$path} ? "\n":"").$str;

			if($path ne $old){
				if($old){
					print "Save $path\n";
					save($old,$pcs{$old});
				}
				$old = $path;
			}


		}

	}
}
close(FILE);



sub save {
	my $path = $_[0];
	my $str = $_[1];
	my ($area,$district,$sector) = split(/\//,$path);
	
	if(!-d $odir.$area){ `mkdir $odir$area`; }
	if(!-d $odir.$area."/".$district){ `mkdir $odir$area/$district`; }
	open(CSV,">",$odir.$area."/".$district."/".$sector.".csv");
	print CSV $str."\n";
	close(CSV);

}
sub clean {
	my $v = $_[0];
	$v =~ s/(^\"|\"$)//g;
	return $v;
}
