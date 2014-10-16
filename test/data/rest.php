<?php
header('Content-Type: application/json');
$total = 500;
$id_prefix = '';
if(isset($_GET['parent']) && is_numeric($_GET['parent'])){
	$id_prefix = ($_GET['parent'] + 1) * 1000;
}
usleep(rand(0,500000));
$start = 0;
$end = 0;
$limit = '';
$debug = '';
foreach($_GET as $param => $value){
    if(strpos($param, 'limit') === 0){
        $limit = $param;
        break;
    }
}
if($limit){
	preg_match('/(\d+),*(\d+)*/', $limit, $matches);
    if(count($matches) > 2){
        $start = $matches[2];
        $end = $matches[1] + $start;
    }else{
        $end = $matches[1];
    }
}else{
	$range = '';
	if(isset($_SERVER['HTTP_RANGE'])){
		$range = $_SERVER['HTTP_RANGE'];
	}elseif(isset($_SERVER['HTTP_X_RANGE'])){
		$range = $_SERVER['HTTP_X_RANGE'];
	}
	if($range){
		preg_match('/(\d+)-(\d+)/', $range, $matches);
		$start = $matches[1];
		$end = $matches[2] + 1;
	}
}
if($end){
	if($end > $total){
		$end = $total;
	}
}else{
	$start = 0;
	$end = 40;
}
header('Content-Range: ' . 'items '.$start.'-'.($end-1).'/'.$total);
echo '[';
for ($i = $start; $i < $end; $i++) {
	if($i != $start){
		echo ',';
	}
    echo '{"id":'.($id_prefix+$i).',"name":"Item '.$i.'","comment":"hello"}';
}
echo ']';
?>
