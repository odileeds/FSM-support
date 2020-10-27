#!/usr/bin/perl
 
use strict;
use warnings;
use Data::Dumper;

my (@lines,@places,%p,$line,$inplace,$n,$str,$placemark,$col,$val,%columns,$i,%done,$id,$dir,$file,$url);

# Get directory
$dir = $0;
if($dir =~ /\//){ $dir =~ s/^(.*)\/([^\/]*)/$1\//g; }
else{ $dir = "./"; }


$file = "all-of-us-together.xml";
$url = "https://www.google.com/maps/d/kml?mid=1FY2YP3o-Yl6XfmquSB8ONAdEOfT-37su&forcekml=1";

if(time() - (stat $dir.$file)[9] >= 600){ 
	`wget -q --no-check-certificate -O "$dir$file" "$url"`;
}

open(FILE,$dir.$file);
@lines = <FILE>;
close(FILE);
$str = join("",@lines);
$str =~ s/[\n\r\t]*//g;


while($str =~ s/<Placemark>(.*?)<\/Placemark>//){
	$placemark = $1;
	%p = ();
	if($placemark =~ /Started a google doc already/){
	}else{

		if($placemark =~ /<name>(.*?)<\/name>/){
			$col = "Name";
			$val = cleanUp($1);
			$p{$col} = cleanUp($1);
			

			# Count columns
			if(!$columns{$col}){ $columns{$col} = 0; }
			$columns{$col}++;
		}
		while($placemark =~ s/<Data name="([^\"]*)">\s*<value>([^\<]*)<\/value>\s*<\/Data>//){
			$col = $1;
			$val = $2;

			if($col eq "Town/City"){
				$col = "Town";
			}
			if($col eq "County"){
				$col = "City/Region";
			}
			if($col eq "Phone number" || $col eq "What is the organisation's phone number? Please include the area code."){
				$col = "Phone";
			}
			if($col eq "source URL" || $col eq "The URL of their announcement" || $col eq "announcement URL"){
				$col = "Link to post";
			}
			if($col eq "The website of the organisation giving the free meals"){
				$col = "Website";
			}
			if($col eq "Which days are meals available?" || $col eq "Which days are the meals available?"){
				$col = "Days";
			}
			if($col eq "What time does the organisation open?"){
				$col = "Opening time";
			}
			if($col eq "What time does the organisation close?"){
				$col = "Closing time";
			}
			if($col eq "How to claim the meal"){
				$col = "How to claim";
			}
			if($col eq "Other info or description about the free meals"){
				$col = "More details";
			}

	#			print "\t$col = $val\n";

			if($col eq "Postcode"){
				if($val =~ /Not Available/i || $val =~ /^-/i || $val =~ /SEE ABOVE/i || $val =~ /^N\/A/i || $val =~ /^\s+$/){
					$val = "";
				}
			}
			if($val){
				$p{$col} = cleanUp($val);
			}

			# Count columns
			if(!$columns{$col}){ $columns{$col} = 0; }
			$columns{$col}++;

		}
		
		
		if($p{'Postcode'} && $p{'Name'}){
			$p{'Postcode'} =~ s/\,//g;
			$p{'Postcode'} = uc $p{'Postcode'};
			if($p{'Postcode'} !~ / /){
				$p{'Postcode'} =~ s/([0-9][A-Z]{2})$/ $1/;
			}
			$id = $p{'Name'}."-".($p{'Postcode'}||"");
			if(!$done{$id}){
				push(@places,{%p});
				$done{$id} = 1;
			}else{
				#print "Added $id already\n";
			}

		}
	}
}

$n = @places;
print "$n\n";
open(FILE,">",$dir."all-of-us-together.csv");
print FILE "\"Name\",\"Town\",\"City/Region\",\"Postcode\",\"Specific schools?\",\"How to claim\",\"Link to post\",\"More details\"\n";
for($i = 0; $i < $n; $i++){
	print FILE "\"$places[$i]{'Name'}\",\"".($places[$i]{'Town'}||"")."\",\"".($places[$i]{'City/Region'}||"")."\",\"".($places[$i]{'Postcode'}||"")."\",,\"".($places[$i]{'How to claim'}||"")."\",\"".($places[$i]{'Link to post'}||"")."\",\"".($places[$i]{'More details'}||"")."\"\n";
}
close(FILE);
#print Dumper %columns;

#"Name","Town","City/Region","Postcode","Specific schools?","How to claim","Link to post","More details"


sub cleanUp {
	my $str = $_[0];
	$str =~ s/^<!\[CDATA\[([^\]]*)\]\]>/$1/g;
	# Remove trailing spaces
	$str =~ s/(^\s|\s$)//g;
	return $str;
}
